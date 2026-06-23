import express  from "express";
import cors from "cors";
// import { createUserSchema } from "@monorepo/utils";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@monorepo/trpc";
const app = express();
const PORT = 5000;
app.use(express.json());
app.use(cors({
    origin:"http://localhost:3000"
}));

app.use(
    "/trpc",
    createExpressMiddleware({
        router: appRouter
    })
);

// app.get("/", (req, res) => {
//     return res.json({ message: "Hello from API" });
// })
// app.post("/users", (req, res) => {
//     const result = createUserSchema.safeParse(req.body);
//     if(!result.success) {
//         const message = result.error.issues.map((issue) => issue.message).join(", ")
//         return res.status(400).json({success:false, message:message });
//     }
//     console.log(result.data);
//     return res.json({success:true, message: "User created" });
// });

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});