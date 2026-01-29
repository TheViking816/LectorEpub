/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sepia: {
                    50: '#fbf0d9',
                    100: '#f7e7c3',
                    200: '#efcf8d',
                    300: '#e7b757',
                    400: '#df9f21',
                    500: '#c58a19',
                    600: '#996b13',
                    700: '#6d4c0e',
                    800: '#412e08',
                    900: '#150f03',
                },
            },
        },
    },
    plugins: [],
}
