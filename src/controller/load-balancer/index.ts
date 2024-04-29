import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { LoadBalancerService } from '../../service/load-balancer';
import {PatchServerRequest} from "../../domain/load-balancer";

export class LoadBalancerController {
    private router: Router;

    constructor(private readonly loadBalanceService: LoadBalancerService) {
        this.router = Router();
        this.router.post('/', this.handleLoadBalanceAPI.bind(this));
        this.router.patch('/server', this.handlePatchServerAPI.bind(this));
    }

    getRouter() {
        return this.router;
    }

    async handleLoadBalanceAPI(req: Request, res: Response) {
        logger.info(`Received request with request body: ${JSON.stringify(req.body)}`);

        let server;
        try {
            server = await this.loadBalanceService.pickServer();
        } catch (err) {
            return res.status(500).json({ message: 'ERROR' });
        }
        if (!server) {
            return res.status(500).json({ message: 'ERROR' });
        }

        let result;
        try {
            result = await this.loadBalanceService.forwardRequest(req, server);
        } catch (err) {
            return res.status(500).json({ message: 'ERROR' });
        }

        return res.status(200).json(result);
    }

    async handlePatchServerAPI(req: Request, res: Response) {
        logger.info(`Received request with request body: ${JSON.stringify(req.body)}`);

        try {
            await this.loadBalanceService.patchServer(req.body as PatchServerRequest);
        } catch (err) {
            return res.status(500).json({ message: 'ERROR' });
        }

        return res.status(200).json({ message: 'SUCCESS' });
    }
}