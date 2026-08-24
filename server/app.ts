import dotenv from 'dotenv';
dotenv.config();
import express, {  Request, Response, RequestHandler } from 'express';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import connectDB from './config/db.config.js';
import paymentRoutes from './routes/PaymentRoutes.js';
import { startTransactionSweeper } from './utils/sweeper.js';




const app = express();
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;

connectDB();

const allowedOrigins = ["https://localhost:3000", "http://localhost:5173"];
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions) as unknown as RequestHandler);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.send('eSewa Payment Integration');
});
app.use("/api", paymentRoutes);
startTransactionSweeper();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});