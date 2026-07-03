/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}',
  ],
  theme: {
    extend: {
      colors: {
        "base0": "var(--color-base0)",
        "base1": "var(--color-base1)",
        "base1a": "var(--color-base1a)",
        "base2": "var(--color-base2)",
        "base3": "var(--color-base3)",
        "base4": "var(--color-base4)",
        "base5": "var(--color-base5)",
        "border": "var(--color-border)",

        "breakpoints": "var(--color-breakpoints)",

        "pseudoinst": "var(--color-pseudoinst)",
        "inst": "var(--color-inst)",
        
        "sp-highlight": "var(--color-sp-highlight)",
        "fp-highlight": "var(--color-fp-highlight)",
        "editor-selection-match": "var(--color-editor-selection-match)",

        "testsuite-red": "var(--color-testsuite-red)",
        "testsuite-green": "var(--color-testsuite-green)",
        
        "debugging": "var(--color-debugging)",
        "addrcolumn": "var(--color-addrcolumn)",

        "regtable-special": "var(--color-regtable-special)",
        "regtable-temp": "var(--color-regtable-temp)",
        "regtable-arg": "var(--color-regtable-arg)",
        "regtable-saved": "var(--color-regtable-saved)",

        "editor-caret": "var(--color-editor-caret)",
        "editor-insn": "var(--color-editor-insn)",
        "editor-reg": "var(--color-editor-reg)",
        "editor-const": "var(--color-editor-const)",
        "editor-directive": "var(--color-editor-directive)",
        "editor-comment": "var(--color-editor-comment)",
        "editor-string": "var(--color-editor-string)",
      },
    },
  },
  plugins: [],
}

