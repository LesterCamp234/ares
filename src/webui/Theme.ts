import { createEffect, createRoot, createSignal, onCleanup } from "solid-js";

export const themeList = {
	light: [
		{ name: "ayu-light", nameUser: "Ayu" },
		{ name: "catpuccin-latte", nameUser: "Catpuccin Latte" },
		{ name: "github-light", nameUser: "Default" },
		{ name: "rose-pine-dawn", nameUser: "Rosé Pine Dawn" },
	], dark: [
		{ name: "ayu-dark", nameUser: "Ayu Dark" },
		{ name: "ayu-mirage", nameUser: "Ayu Mirage" },
		{ name: "catpuccin-frappe", nameUser: "Catpuccin Frappé" },
		{ name: "catpuccin-macchiato", nameUser: "Catpuccin Macchiato" },
		{ name: "catpuccin-mocha", nameUser: "Catpuccin Mocha" },
		{ name: "github-dark", nameUser: "Default" },
		{ name: "rose-pine", nameUser: "Rosé Pine" },
		{ name: "rose-pine-moon", nameUser: "Rosé Pine Moon" },
	]
};

export const [lightTheme, setLightTheme] = createSignal(getTheme("light"));
export const [darkTheme, setDarkTheme] = createSignal(getTheme("dark"));
export const [themeMode, setThemeMode] = createSignal<"light" | "dark" | "system">((() => {
	let mode = localStorage.getItem("theme_mode");
	if (mode === "light" || mode === "dark" || mode === "system") return mode;
	return "system";
})());

// dark -> light -> system
export function cycleTheme(): void {
	const curr = themeMode();
	if (curr === "dark") setThemeMode("light");
	else if (curr === "light") setThemeMode("system");
	else setThemeMode("dark");
}

function updateCssTheme() {
	const dark = themeMode() === "system"
		? window.matchMedia("(prefers-color-scheme: dark)").matches
		: themeMode() === "dark";
	document.documentElement.dataset.theme = dark ? getTheme("dark") : getTheme("light");
}

createRoot(() => {
	const mql = window.matchMedia("(prefers-color-scheme: dark)");
	mql.addEventListener("change", updateCssTheme);
	onCleanup(() => mql.removeEventListener("change", updateCssTheme));

	createEffect(() => {
		localStorage.setItem("theme_light", lightTheme());
		localStorage.setItem("theme_dark", darkTheme());
		localStorage.setItem("theme_mode", themeMode());
		updateCssTheme();
	});
});


function getTheme(mode: "light" | "dark"): string {
	const key = mode === "light" ? "theme_light" : "theme_dark";
	const fallback = mode === "light" ? "github-light" : "github-dark";
	const saved = localStorage.getItem(key);
	const valid = themeList[mode].some(t => t.name === saved);
	return valid ? saved! : fallback;
}