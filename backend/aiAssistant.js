// backend/aiAssistant.js
// SIMULATION MODE: Robust keyword matching for demo

export async function chatWithAI(userMessage) {
    const msg = userMessage.toLowerCase();

    // --- FILTER COMMANDS ---

    if (msg.includes("remote")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { location: "Remote" },
            reply: "I've filtered the list to show only Remote jobs for you! 🏠"
        });
    }

    if (msg.includes("bangalore") || msg.includes("bengaluru")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { location: "Bangalore" },
            reply: "Here are the opportunities located in Bangalore. 🌆"
        });
    }

    if (msg.includes("react")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { role: "React" },
            reply: "Showing you all React & Frontend positions. ⚛️"
        });
    }

    if (msg.includes("node") || msg.includes("backend")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { role: "Node" },
            reply: "Here are the Backend Engineering roles I found. 🟢"
        });
    }

    if (msg.includes("design") || msg.includes("ui/ux") || msg.includes("figma")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { role: "Designer" },
            reply: "Filtering for Product Design and UI/UX roles. 🎨"
        });
    }

    if (msg.includes("python") || msg.includes("ai") || msg.includes("data")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { role: "AI" }, // Matches 'AI/ML Engineer'
            reply: "Showing AI, Machine Learning, and Data Science roles. 🤖"
        });
    }

    if (msg.includes("clear") || msg.includes("reset") || msg.includes("show all")) {
        return JSON.stringify({
            type: "FILTER_ACTION",
            criteria: { role: "", location: "" },
            reply: "I've cleared all filters. Showing all jobs again! 📋"
        });
    }

    // --- GENERAL CONVERSATION ---

    if (msg.includes("hello") || msg.includes("hi")) {
        return "Hello! I am your AI Career Assistant. I can filter jobs by role (e.g., 'React', 'Design') or location (e.g., 'Remote').";
    }

    if (msg.includes("help") || msg.includes("what can you do")) {
        return "I can help you filter jobs! Try saying:\n- 'Show me Remote jobs'\n- 'Find Designer roles'\n- 'Show Python jobs'\n- 'Clear filters'";
    }

    // Default
    return "I'm not sure about that. Try asking me to 'Filter by Remote' or 'Show React jobs'.";
}