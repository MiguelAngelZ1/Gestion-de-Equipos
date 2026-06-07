const { z } = require('zod');

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

function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            const messages = result.error.issues.map(e => e.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        req.params = result.data;
        next();
    };
}

function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            const messages = result.error.issues.map(e => e.message).join(', ');
            return res.status(400).json({ error: messages });
        }
        req.query = result.data;
        next();
    };
}

module.exports = { validateBody, validateParams, validateQuery };
