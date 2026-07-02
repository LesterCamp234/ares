import { Component, createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { darkTheme, lightTheme, setDarkTheme, setLightTheme, themeList } from "./Theme";


export const Settings: Component<{ close: () => void }> = (props) => {
    let modalRef: HTMLDivElement | undefined;
    const [selection, setSelection] = createSignal(0);

    function modifyTheme(value: string, light: boolean) {
        if (light) setLightTheme(value);
        else setDarkTheme(value);
    }

    createEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") props.close();
        };

        window.addEventListener("keydown", handleKeyDown);
        modalRef?.focus();

        onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
    });
    return (
        <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={props.close}
        >
            <div
                ref={modalRef}
                tabindex="-1"
                class="relative flex flex-col w-full max-w-[90vw] max-h-[90vh] border overflow-hidden theme-border outline-none"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <header class="sticky top-0 z-10 flex items-center justify-between pl-4 theme-border border-b theme-bg">
                    <h2 id="modal-title" class="text-lg font-bold text-base4">
                        settings
                    </h2>
                    <button
                        onClick={props.close}
                        aria-label="Close modal"
                        type="button"
                        class="theme-bg p-2 text-base4 cursor-pointer material-symbols-outlined"
                    >
                        {"close"}
                    </button>
                </header>

                <div class="flex flex-row px-4 h-full items-center theme-bg">
                    <div class="flex flex-col pt-4 pb-4 mr-2 pr-4 justify-evenly ">
                        <button
                            type="button"
                            aria-label="Settings"
                            class="theme-bg text-base4 cursor-pointer text-xl"
                            onClick={() => setSelection(0)}
                        >
                            theming
                        </button>
                        <button
                            type="button"
                            aria-label="Settings"
                            class="theme-bg text-base4 cursor-pointer text-xl mt-4"
                            onClick={() => setSelection(1)}
                        >
                            about
                        </button>
                    </div><Show when={selection() == 0}>
                        <div class="flex flex-col w-full gap-3 h-full justify-center">
                            <div class="flex flex-row justify-between gap-1 mt-2 ml-[2%] mr-[2%]">
                                <p class="text-base4 text-lg font-bold self-center">light theme</p>
                                <div class="pb-0.5 relative inline-block w-48">
                                    <select
                                        class="appearance-none font-semibold w-full text-left pr-6 theme-fg theme-gutter theme-border focus:outline-none cursor-pointer bg-transparent"
                                        onChange={e => modifyTheme(e.target.value, true)}
                                        value={lightTheme()}
                                    >
                                        <For each={themeList.light}>
                                            {theme => <option class="theme-gutter theme-fg" value={theme.name}>{theme.nameUser}</option>}
                                        </For>
                                    </select>
                                    <svg class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 theme-fg"
                                        xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" /></svg>
                                </div>
                            </div>

                            <div class="flex flex-row justify-between gap-1 mb-2 ml-[2%] mr-[2%]">
                                <p class="text-base4 text-lg font-bold self-center">dark theme</p>
                                <div class="pb-0.5 relative inline-block w-48">
                                    <select
                                        class="appearance-none font-semibold w-full text-left pr-6 theme-fg theme-gutter theme-border focus:outline-none cursor-pointer bg-transparent"
                                        onChange={e => modifyTheme(e.target.value, false)}
                                        value={darkTheme()}
                                    >
                                        <For each={themeList.dark}>
                                            {theme => <option class="theme-gutter theme-fg" value={theme.name}>{theme.nameUser}</option>}
                                        </For>
                                    </select>
                                    <svg class="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 theme-fg"
                                        xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z" /></svg>
                                </div>
                            </div>
                        </div>
                    </Show>
                    <Show when={selection() == 1}>
                        <div class="flex flex-col w-full h-full justify-center ml-[2%] mr-[2%] pb-2 pt-2">
                            <a class="text-3xl font-bold underline text-base4 hover:text-highlight-low" href="https://github.com/ldlaur/ares" >
                                ARES
                            </a>
                            <p class="text-base4 mt-2">
                                A RISC-V (RV32IMC) educational simulator built to help computer architecture students visualize registers, memory, call stacks, and catch common calling convention mistakes.
                            </p>
                            <p class="text-base4">
                                It's inspired by RARS and MARS, and aims to be their spiritual successor on the web.
                            </p>
                            <p class="text-base4 mt-1">
                                Found a bug or have a feature idea? Don't hesitate to open an issue or pull request on
                                <a href="https://github.com/ldlaur/ares" class=" pl-1 underline font-bold text-base4 hover:text-highlight-low">GitHub</a>.
                            </p>
                            <p class="text-base4 mt-1">Thanks to all contributors, testers, and everyone who's used ARES.</p>
                        </div>
                    </Show>
                </div>
            </div>
        </div>
    );
};
