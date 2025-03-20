import express from 'express';
import morgan from 'morgan';
import sessionRoutes from './routes/sessionRoutes.js';
import './DB.js';
import cors from 'cors'
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', sessionRoutes);

export default app;
