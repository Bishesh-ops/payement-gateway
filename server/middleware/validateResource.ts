import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

const validate = (schema: ZodType<object>) => 
(req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            return res.status(400).json({ errors: errorMessages });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default validate;