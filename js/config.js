// Where the Django API lives.
// 1. Replace YOUR_USERNAME with your PythonAnywhere username before pushing to GitHub Pages.
// 2. When you move to a DigitalOcean droplet later, change this one line.
const PRODUCTION_API = "https://pssreenath.pythonanywhere.com/api";
const LOCAL_API = "http://127.0.0.1:8000/api";

const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);

// You can also override it for testing: add ?api=https://host/api to any page URL once.
const override = new URLSearchParams(location.search).get("api");
if (override) localStorage.setItem("av_api_override", override);

export const API_BASE = (localStorage.getItem("av_api_override") || (isLocal ? LOCAL_API : PRODUCTION_API)).replace(/\/$/, "");
