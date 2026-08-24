// app.ts
import "dotenv/config";
import express, { Request, RequestHandler, Response } from "express";
import cors, { CorsOptions } from "cors";
import paymentRoutes from "./routes/PaymentRoutes.js";
import { startTransactionSweeper } from "./utils/sweeper.js";
import { checkDbConnection } from "./config/db.config.js"; 

const app = express();
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;

const allowedOrigins = ["https://localhost:3000", "http://localhost:5173"];
const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
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
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.get("/", (req: Request, res: Response) => {
  res.send("Payment Gateway API is running");
});
app.use("/api", paymentRoutes);

startTransactionSweeper();

const startServer = async () => {
  await checkDbConnection();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
};

startServer();