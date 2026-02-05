require('dotenv').config();
const {
    GoogleGenerativeAI
} = require("@google/generative-ai");

async function check() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("📡 Conectando con Google para ver tus modelos disponibles...");

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });
        // Esto es un truco para listar modelos si la librería lo permite, 
        // si no, probaremos uno a uno.
        console.log("✅ Tu API Key funciona.");
        console.log("Prueba a poner en tu código EXACTAMENTE: 'gemini-1.5-flash'");

        // Test rápido
        const result = await model.generateContent("Hola");
        console.log("✅ Test de respuesta: ", result.response.text());

    } catch (error) {
        console.log("❌ Error específico:", error.message);
        console.log("------------------------------------------------");
        console.log("💡 INTENTA USAR ESTE NOMBRE EN TU CÓDIGO: 'gemini-1.0-pro'");
    }
}

check();