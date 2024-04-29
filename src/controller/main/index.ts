import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { sleep } from '../../utils/time';

export class MainController {
    private router: Router;

    constructor() {
        this.router = Router();
        this.router.post('/', this.handleMainAPI.bind(this));
        this.router.get('/healthcheck', this.handleHealthCheckAPI.bind(this));
    }

    getRouter() {
        return this.router;
    }

    async handleMainAPI(req: Request, res: Response) {
        logger.info(`Received request with request body: ${JSON.stringify(req.body)}`);

        if (req.body.key === 'delay') {
            await sleep(5000);
        } else if (req.body.key === 'error') {
            return res.status(500).json({ message: 'ERROR' });
        }

        return res.status(200).json(req.body);
    }

    async handleHealthCheckAPI(req: Request, res: Response) {
        logger.info(`Received request with request body: ${JSON.stringify(req.body)}`);

        return res.status(200).json({ status: 'OK' });
    }
}