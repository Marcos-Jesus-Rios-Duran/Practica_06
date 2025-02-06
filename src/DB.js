import mongoose from 'mongoose';

const url = 'mongodb+srv://marcos:mrcojdr25@tiendavirtual.ua0tv.mongodb.net/Sesiones?retryWrites=true&w=majority&appName=TiendaVirtual';

const connectDB = () => {
    mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error de conexión:', err));
};

export default connectDB;
