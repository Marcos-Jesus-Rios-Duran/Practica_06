//index donde se inicializa la aplicacion
import app from './src/app.js';
import connectDB from './src/DB.js';

// Llamar la función para conectar a la base de datos
connectDB();

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});
