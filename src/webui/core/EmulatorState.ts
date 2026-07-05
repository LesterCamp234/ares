import {
    convertNumber,
    instructionSizeFromHalfword,
    REG_SP,
    STACK_LEN,
    STACK_TOP,
    TEXT_BASE,
    WasmInterface,
} from "./RiscV";

export type ShadowStackEntry = {
    name: string;
    args: number[];
    sp: number;
    elems: { addr: number; text: string }[];
};

export type AssemblyError = { line: number; message: string };

export type EmulatorState =
    | { status: "idle"; version: number }
    | { status: "asmerr"; error: AssemblyError; version: number }
    | {
        status: "stopped";
        consoleText: string;
        pc: number;
        regs: number[];
        version: number;
    }
    | {
        status: "debug";
        consoleText: string;
        pc: number;
        regs: number[];
        shadowStack: ShadowStackEntry[];
        memWrittenAddr: number;
        memWrittenLen: number;
        regWritten: number;
        line: number;
        version: number;
    }
    | {
        status: "error";
        consoleText: string;
        pc: number;
        regs: number[];
        shadowStack: ShadowStackEntry[];
        line: number;
        version: number;
    };

export type TestCaseResult = {
    input: string;
    output: string;
    userOutput: string;
    runErr: boolean;
};

export type TestSuiteResult = {
    results: TestCaseResult[];
    state: EmulatorState;
};

export type TestData = {
    assignment: string;
    testPrefix: string;
    testcases: { input: string; output: string }[];
};

export class Emulator {
    private readonly wasm: WasmInterface;

    private breakpointAddrs = new Set<number>();
    private breakpointLines: number[] = [];

    private readonly testData: TestData | null = null;

    // for testsuite it only contains the user input
    // not the scaffolding
    private lastInput: string = "";

    private currentState: EmulatorState = { status: "idle", version: 0 };

    private version: number = 0;

    constructor(wasm: WasmInterface, testData: TestData | null) {
        this.wasm = wasm;
        this.testData = testData;
    }

    private regs(): number[] {
        const regs = [];
        for (let i = 0; i < 32; i++) {
            regs.push(this.wasm.getReg(i));
        }
        return regs;
    }

    // -- breakpoints --

    setBreakpointLines(lines: number[]): void {
        this.breakpointLines = lines;
    }

    private resolveBreakpoints(): void {
        this.breakpointAddrs = new Set();
        for (const line of this.breakpointLines) {
            const r = this.wasm.getAddrFromLine(line);
            this.breakpointAddrs.add(r.start);
        }
    }

    public getAddrFromLine(line: number): { start: number, len: number } {
        return this.wasm.getAddrFromLine(line);
    }

    // -- statemachine --

    private buildInternal(
        source: string,
        suffix: string,
    ): AssemblyError | null {
        this.lastInput = source;
        const combined = source + "\n" + suffix;
        const err = this.wasm.build(combined);
        return err;
    }

    // suffix is appended after user code, so line numbers in errors are preserved
    private build(
        source: string,
        suffix: string,
    ): Extract<EmulatorState, { status: "idle" | "asmerr" }> {
        const err = this.buildInternal(source, suffix);
        if (err !== null) {
            return (this.currentState = {
                status: "asmerr",
                error: err,
                version: ++this.version,
            });
        }
        return (this.currentState = {
            status: "idle",
            version: ++this.version,
        });
    }

    // it's used by the linter calls so the stopped state can persist
    // assume the following situation
    // user is in state=debug
    // code finishes execution correctly, state=stopped
    // editor triggers a relint: without buildForLinter being different, we'd go to
    // state=idle and lose the console text
    buildForLinter(source: string): Extract<EmulatorState, { status: "idle" | "asmerr" }> | null {
        if (this.lastInput === source) return null;
        const suffix =
            this.testData ?
                this.testData.testPrefix + this.testData.testcases[0].input
                : "";
        return this.build(source, suffix);
    }

    quitDebug(): Extract<EmulatorState, { status: "idle" }> {
        return (this.currentState = {
            status: "idle",
            version: ++this.version,
        });
    }

    private advanceState(): Extract<
        EmulatorState,
        { status: "stopped" | "debug" | "error" }
    > {
        const consoleText = this.wasm.textBuffer;
        const pc = this.wasm.getPc();
        const regs = this.regs();

        if (this.wasm.hasError) {
            return (this.currentState = {
                status: "error",
                consoleText,
                pc,
                regs,
                shadowStack: this.buildShadowStack(),
                line: this.getCurrentLine(),
                version: ++this.version,
            });
        }
        if (this.wasm.successfulExecution) {
            return (this.currentState = {
                status: "stopped",
                consoleText: consoleText,
                pc,
                regs,
                version: ++this.version,
            });
        }
        // also includes the initial debug state
        return (this.currentState = {
            status: "debug",
            consoleText,
            pc,
            regs,
            shadowStack: this.buildShadowStack(),
            memWrittenAddr: this.wasm.getMemWrittenAddr(),
            memWrittenLen: this.wasm.getMemWrittenLen(),
            regWritten: this.wasm.getRegWritten(),
            line: this.getCurrentLine(),
            version: ++this.version,
        });
    }

    // NOTE: as with continueExecution() this could get sluggish for very large programs
    // consider making it asynchronous or using Web Workers later
    // note that this.wasm has a termination condition on too many instructions executed
    // Ignores breakpoints, since it's meant to run to completion
    // (or runtime error)
    run(
        source: string,
    ): Extract<EmulatorState, { status: "stopped" | "error" | "asmerr" }> {
        const buildResult = this.build(source, "");
        if (buildResult.status === "asmerr") return buildResult;

        while (true) {
            this.wasm.run();
            if (this.wasm.successfulExecution || this.wasm.hasError) break;
        }
        let state = this.advanceState();
        if (state.status === "debug")
            throw new Error("run() must run to completion or error");
        return state;
    }

    private runTestCase(
        testData: TestData,
        source: string,
        testcase: { input: string; output: string },
    ): TestCaseResult {
        const suffix = testData.testPrefix + testcase.input;
        const buildResult = this.buildInternal(source, suffix);
        if (buildResult !== null) {
            return {
                ...testcase,
                runErr: true,
                userOutput: buildResult.message,
            };
        }
        while (true) {
            this.wasm.run();
            if (this.wasm.successfulExecution || this.wasm.hasError) break;
        }
        return {
            ...testcase,
            runErr: !this.wasm.successfulExecution,
            userOutput: this.wasm.textBuffer.trim(),
        };
    }

    runTestSuite(source: string): TestSuiteResult {
        if (this.testData === null) throw new Error("No test data loaded");
        const testData = this.testData;
        let testcases = testData.testcases.map((tc) =>
            this.runTestCase(testData, source, tc),
        );
        // restore global state to testcase 0 so the memoryview is in a defined state
        // and currentState reflects any assembly error in user code
        let newState = this.build(
            source,
            this.testData.testPrefix + this.testData.testcases[0].input,
        );
        return { state: newState, results: testcases };
    }

    // no instructions executed yet
    // but code loaded, PC set and state="debug"
    startDebug(
        source: string,
    ): Extract<EmulatorState, { status: "debug" | "asmerr" }> {
        const buildResult = this.build(source, "");
        if (buildResult.status === "asmerr") return buildResult;
        let state = this.advanceState();
        if (state.status !== "debug")
            throw new Error("must not happen: no instructions executed");
        return state;
    }

    startDebugTestCase(source: string, testCaseIndex: number): EmulatorState {
        if (this.testData === null) throw new Error("No test data loaded");
        const { testcases, testPrefix } = this.testData;
        const suffix = testPrefix + testcases[testCaseIndex].input;
        const buildResult = this.build(source, suffix);
        if (buildResult.status === "asmerr") return buildResult;
        // switch to debug state with no instructions executed
        let state: EmulatorState = this.advanceState();
        if (this.wasm.getPc() != TEXT_BASE) {
            // run instructions until you hit user code
            // safety: continueExecution has infinite loop prevention
            state = this.continueExecution({
                pc: TEXT_BASE,
                sp: this.wasm.getReg(REG_SP),
            });
        }
        return state;
    }

    singleStep(): EmulatorState {
        if (this.currentState.status != "debug") return this.currentState;
        this.wasm.run();
        return this.advanceState();
    }

    nextStep(): EmulatorState {
        if (this.currentState.status != "debug") return this.currentState;
        const pc = this.wasm.getPc();
        const halfword = this.load(pc, 2);
        const size = instructionSizeFromHalfword(halfword);
        const inst = size === 2 ? halfword : this.load(pc, 4);
        const opcode = inst & 0x7f;
        const funct3 = (inst >> 12) & 0x7;
        const rd = (inst >> 7) & 0x1f;
        let isCall =
            size === 4 &&
            (opcode === 0x6f || (opcode === 0x67 && funct3 === 0)) &&
            rd === 1;

        if (size === 2) {
            const funct3c = (inst >> 13) & 0x7;
            const opcodec = inst & 0x3;
            const rs1 = (inst >> 7) & 0x1f;
            const rs2 = (inst >> 2) & 0x1f;
            isCall =
                (opcodec === 0b01 && funct3c === 0b001) ||
                (opcodec === 0b10 &&
                    funct3c === 0b100 &&
                    ((inst >> 12) & 1) === 1 &&
                    rs1 !== 0 &&
                    rs2 === 0);
        }

        if (isCall) {
            let state = this.continueExecution({
                pc: pc + size,
                sp: this.wasm.getReg(REG_SP),
            });
            return state;
        }
        return this.singleStep();
    }

    // NOTE: as with run() this could get sluggish for very large programs
    // consider making it asynchronous or using Web Workers later
    // note that this.wasm has a termination condition on too many instructions executed
    public continueExecution(temporaryBreakpoint?: {
        pc: number;
        sp: number;
    }): EmulatorState {
        if (this.currentState.status != "debug") return this.currentState;
        this.resolveBreakpoints();
        while (true) {
            this.wasm.run();
            const pc = this.wasm.getPc();
            if (
                temporaryBreakpoint &&
                temporaryBreakpoint.pc === pc &&
                temporaryBreakpoint.sp === this.wasm.getReg(REG_SP)
            ) {
                break;
            }
            if (this.wasm.getGotBreakpoint()) break;
            if (this.breakpointAddrs.has(pc)) break;
            if (this.wasm.successfulExecution || this.wasm.hasError) break;
        }
        return this.advanceState();
    }


    // NOTE: this is O(n), it restarts from the start of the program
    // for now it's fine, but consider a snapshot system later
    public reverseStep(): EmulatorState {
        if (this.currentState.status != "debug") return this.currentState;
        if (this.wasm.numOfExecutedInstructions <= 0) return this.currentState;

        const oldAddr = this.wasm.getMemWrittenAddr();
        const oldLen = this.wasm.getMemWrittenLen();
        const oldReg = this.wasm.getRegWritten();

        this.wasm.reverseStep();
        let state = this.advanceState();
        // this.currentState === state
        if (state.status != "debug") return state;

        // need to adjust the state so the visualization shows the last operation being undone
        state.memWrittenAddr = oldAddr;
        state.memWrittenLen = oldLen;
        state.regWritten = oldReg;
        return state;
    }

    // -- auxiliary --

    private buildShadowStack(): ShadowStackEntry[] {

        // shadow stack is reversed compared to a regular stack:
        // since it is just a vector
        // i.e. the most recent element is the last one
        const len = this.wasm.getShadowStackLen();
        let liveSp = this.wasm.getReg(REG_SP);
        return Array.from({ length: len }, (_, i) => {
            let frameSp = this.wasm.getShadowStackSp(i);
            // augment shadow stack with per-position info

            // for inner frames, the end of one frame is the start of the next
            // but for the last one there is no next, so use the actual SP as the base
            const frameBase =
                i === len - 1 ? liveSp : this.wasm.getShadowStackSp(i + 1);

            let elemCount = (frameSp - frameBase) / 4;

            // could happen on broken code if sp grows in the opposite direction
            if (elemCount < 0) elemCount = 0;

            const elems = Array.from({ length: elemCount }, (_, j) => {
                const ptr = frameSp - 4 - j * 4;
                let text = convertNumber(this.load(ptr, 4), true);
                const off = (ptr - (STACK_TOP - STACK_LEN)) / 4;
                const regIdx = this.wasm.getCallsanWrittenBy(off);
                if (regIdx === 0xff) text = "??";
                else if (regIdx !== 0)
                    text += ` (${this.wasm.getRegisterName(regIdx)})`;
                return { addr: ptr, text };
            });

            const args = [];
            for (let j = 0; j < 8; j++) {
                args.push(this.wasm.getShadowStackArgs(i, j));
            }

            return {
                name: this.wasm.getStringFromPc(this.wasm.getShadowStackPc(i)),
                args: args,
                sp: frameSp,
                elems,
            };
        }).reverse();
    }

    private getCurrentLine(): number {
        return this.wasm.getLineFromPc();
    }

    // -- wrappers to be passed directly

    disassemble(pc: number): string {
        return this.wasm.disassemble(pc);
    }

    load(addr: number, size: number): number {
        return this.wasm.emu_load(addr, size);
    }
}
