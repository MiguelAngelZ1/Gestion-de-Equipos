function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const messages = result.error.issues.map(e => e.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        req.body = result.data;
        next();
    };
}

module.exports = { validateBody };
