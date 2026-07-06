import { Component, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import {
    appendCustomTheme,
    cssVarNames,
    darkTheme,
    lightTheme,
    setDarkTheme,
    setLightTheme,
    setTheme,
    themeList
} from "./Theme";
import { Modal } from "./Modal";

export const Settings: Component<{ close: () => void }> = (props) => {
    const [selection, setSelection] = createSignal(0);
    const [themeError, setThemeError] = createSignal("");
    const [displayError, setDisplayError] = createSignal(false);
    let customThemeLight = false;

    function modifyTheme(value: string, light: boolean) {
        const suffix = light ? "light" : "dark";
        if (value === "custom-" + suffix) {
            if (document.getElementById("customTheme-" + suffix) === null) {
                const custom = localStorage.getItem("customTheme-" + suffix);
                if (custom !== null && custom !== "") {
                    appendCustomTheme(custom, suffix);
                    setTheme(value, light);
                }
            } else {
                setTheme(value, light);
            }
        } else {
            setTheme(value, light);
        }
    }

    function readJSON(event: ProgressEvent<FileReader>) {
        if (event.target?.result != null) {
            let json;
            let err = false;
            try {
                json = JSON.parse(event.target.result as string);
            } catch (e) {
                err = true;
            }
            if (!err) {
                let i= 0;
                while (i < cssVarNames.length && !err) {
                    if (cssVarNames[i] in json) {
                        i++
                    } else {
                        err = true;
                    }
                }
                if (!err) {
                    let css: string;
                    const suffix = customThemeLight ? "light" : "dark";
                    css = css = `:root[data-theme="custom-${suffix}"] {`;
                    for (i = 0; i < cssVarNames.length; i++) {
                        css += "--color-" + cssVarNames[i] + ":" + json[cssVarNames[i]] + ";";
                    }
                    css += "}";
                    appendCustomTheme(css, suffix);
                    localStorage.setItem("customTheme-" + suffix, css);
                } else {
                    setDisplayError(true);
                    setThemeError("Your custom theme didn't contain all required keys.")
                }
            } else {
                setDisplayError(true);
                setThemeError("There was a problem parsing this file.")
            }
        }
    }

    function onChange(event: Event & {
        currentTarget: HTMLInputElement
        target: HTMLInputElement
    }, light: boolean) {
        let file = event.target.files![0];
        if (file.type == "application/json") {
            customThemeLight = light;
            const reader = new FileReader();
            reader.onload = readJSON;
            reader.readAsText(file);
        } else {
            setDisplayError(true);
            setThemeError(`Unsupported type ${file.type}`);
        }
    }

    return (
        <Modal title={"settings"} close={props.close}>
            <div class="flex flex-row px-4 h-full items-center bg-base0">
                <div class="flex flex-col pt-4 pb-4 mr-2 pr-4 justify-evenly ">
                    <button
                        type="button"
                        aria-label="Settings"
                        class="bg-base0 text-base4 cursor-pointer text-xl"
                        onClick={() => setSelection(0)}
                        classList={{
                            "font-bold": selection() === 0,
                        }}
                    >
                        theming
                    </button>
                    <button
                        type="button"
                        aria-label="Settings"
                        class="bg-base0 text-base4 cursor-pointer text-xl mt-4"
                        onClick={() => setSelection(1)}
                        classList={{
                            "font-bold": selection() === 1,
                        }}

                    >
                        about
                    </button>
                </div>
                <Show when={selection() == 0}>
                    <div class="flex flex-col w-full gap-3 h-full justify-center">
                        <div class="flex flex-row justify-between gap-1 mt-2 ml-[2%] mr-[2%]">
                            <p class="text-base4 text-lg font-bold self-center">light theme</p>
                            <div class="pb-0.5 relative inline-block w-48">
                                <select
                                    class="font-semibold w-full text-left pr-6 pb-1 pl-2 border-b-2 theme-fg bg-base0 border-b-base2 focus:outline-none cursor-pointer"
                                    onChange={e => modifyTheme(e.target.value, true)}
                                    value={lightTheme()}
                                >
                                    <For each={themeList.light}>
                                        {theme => <option class="bg-base0 theme-fg" value={theme.name}>{theme.nameUser}</option>}
                                    </For>
                                </select>
                            </div>
                        </div>

                        <div class="flex flex-row justify-between gap-1 mb-2 ml-[2%] mr-[2%]">
                            <p class="text-base4 text-lg font-bold self-center">dark theme</p>
                            <div class="pb-0.5 relative inline-block w-48">
                                <select
                                    class="font-semibold w-full text-left pr-6 pb-1 pl-2 border-b-2 theme-fg bg-base0 border-b-base2 focus:outline-none cursor-pointer"
                                    onChange={e => modifyTheme(e.target.value, false)}
                                    value={darkTheme()}
                                >
                                    <For each={themeList.dark}>
                                        {theme => <option class="bg-base0 theme-fg" value={theme.name}>{theme.nameUser}</option>}
                                    </For>
                                </select>
                                </div>
                        </div>
                        <div class="flex flex-row justify-between gap-1 mb-2 ml-[2%] mr-[2%]">
                            <p class="text-base4 text-lg font-bold self-center">custom light theme</p>
                            <input type="file" id="customTheme" class="theme-fg bg-base0" onChange={(e) => onChange(e, true)}/>
                        </div>
                        <div class={(displayError() ? "flex" : "hidden") + " flex-row p-4 mb-4 gap-2 border-dashed border-2 border-editor-reg"}>
                            <span class="text-xl font-bold text-editor-reg">Error!</span>
                            <p class="text-base4 font-medium self-center">{themeError()}</p>
                            <p class="text-base4 font-medium self-center">For more information, see our guide</p>
                            <a href="#" class="pl-1 underline font-bold text-base4">here</a>
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
                            <a href="https://github.com/ldlaur/ares" class=" pl-1 underline font-bold text-base4">GitHub</a>.
                        </p>
                        <p class="text-base4 mt-1 pb-2">Thanks to all contributors, testers, and everyone who's used ARES.</p>
                        <p class="text-base4 mt-1">Rosé Pine theme based on the original at <a class="underline" href="https://rosepinetheme.com/">https://rosepinetheme.com/</a></p>
                        <p class="text-base4 mt-1">Catppuccin theme based on the original at <a class="underline" href="https://catppuccin.com/">https://catppuccin.com/</a></p>
                        <p class="text-base4 mt-1">Ayu theme based on the original at <a class="underline" href="https://ayutheme.com/">https://ayutheme.com/</a></p>
                    </div>
                </Show>
            </div>
        </Modal>
    );
};
