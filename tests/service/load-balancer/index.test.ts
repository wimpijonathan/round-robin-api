import {LoadBalancerService} from "../../../src/service/load-balancer";
import {Server, ServerStatus} from "../../../src/domain/server";
import {Request} from 'express';
import {sleep} from "../../../src/utils/time";
import axios from "axios";

jest.setTimeout(30000);
jest.mock('axios', () => jest.fn());

describe('Load Balancer Service tests', () => {
    let servers: Server[] = [
        { host: 'localhost', port: 3000, healthyCount: 0, errorCount: 0, slowCount: 0, status: ServerStatus.AVAILABLE },
        { host: 'localhost', port: 3001, healthyCount: 0, errorCount: 0, slowCount: 0, status: ServerStatus.AVAILABLE },
        { host: 'localhost', port: 3002, healthyCount: 0, errorCount: 0, slowCount: 0, status: ServerStatus.AVAILABLE }
    ];

    describe('(-) pickServer', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        describe('given all servers are available', () => {
            it('should return server based on the round robin logic', async () => {
                let loadBalancerService = new LoadBalancerService(servers);
                const result1 = await loadBalancerService.pickServer();
                const result2 = await loadBalancerService.pickServer();
                const result3 = await loadBalancerService.pickServer();
                const result4 = await loadBalancerService.pickServer();

                expect(result1).toEqual(servers[0])
                expect(result2).toEqual(servers[1])
                expect(result3).toEqual(servers[2])
                expect(result4).toEqual(servers[0])
            });
        });

        describe('given one of the server is unavailable', () => {
            it('should return server based on the round robin logic', async () => {
                const tempServers = servers;
                tempServers[1].status = ServerStatus.UNAVAILABLE;
                let tempLoadBalancerService = new LoadBalancerService(tempServers);

                const result1 = await tempLoadBalancerService.pickServer();
                const result2 = await tempLoadBalancerService.pickServer();
                const result3 = await tempLoadBalancerService.pickServer();
                const result4 = await tempLoadBalancerService.pickServer();

                expect(result1).toEqual(servers[0])
                expect(result2).toEqual(servers[2])
                expect(result3).toEqual(servers[0])
                expect(result4).toEqual(servers[2])
            });
        });

        describe('given there is no available server', () => {
            it('should throw error', async () => {
                let tempLoadBalancerService = new LoadBalancerService([{ host: 'localhost', port: 3000, healthyCount: 0, errorCount: 0, slowCount: 0, status: ServerStatus.UNAVAILABLE }]);

                const result = tempLoadBalancerService.pickServer();
                await expect(result).rejects.toThrowError();
            });
        });
    });

    describe('(-) forwardRequest', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        describe('given success response with less than 5s response time', () => {
            it('should return response with incrementing healthyCount', async () => {
                let loadBalancerService = new LoadBalancerService(servers);
                const mockAxios = axios as unknown as jest.Mock;
                mockAxios.mockImplementationOnce(() => {
                    return Promise.resolve({ data: { key: 'test' } })
                });

                const result = await loadBalancerService.forwardRequest({ method: 'POST', body: { key: 'test' }} as unknown as Request, servers[0]);
                expect(result).toEqual({ key: 'test' });
                expect(loadBalancerService.getServers()[0].healthyCount).toEqual(1);
            });
        });

        describe('given success response with more than 5s response time', () => {
            it('should return response with incrementing slowCount', async () => {
                let loadBalancerService = new LoadBalancerService(servers);
                const mockAxios = axios as unknown as jest.Mock;
                mockAxios.mockImplementationOnce(async () => {
                    await sleep(6000);
                    return Promise.resolve({ data: { key: 'test' } })
                });

                const result = await loadBalancerService.forwardRequest({ method: 'POST', body: { key: 'test' }} as unknown as Request, servers[0]);
                expect(result).toEqual({ key: 'test' });
                expect(loadBalancerService.getServers()[0].slowCount).toEqual(1);
            });
        });

        describe('given error response', () => {
            it('should throw error and incrementing errorCount', async () => {
                let loadBalancerService = new LoadBalancerService(servers);
                const mockAxios = axios as unknown as jest.Mock;
                mockAxios.mockImplementationOnce(() => {
                    throw new Error('error');
                });

                const result = loadBalancerService.forwardRequest({ method: 'POST', body: { key: 'test' }} as unknown as Request, servers[0]);
                await expect(result).rejects.toThrowError();
                expect(loadBalancerService.getServers()[0].errorCount).toEqual(1);
            });
        });
    });

    describe('(-) patchServer', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        describe('given append field in the request body for new server', () => {
            it('should add new server to the servers property', async () => {
                let loadBalancerService = new LoadBalancerService([]);

                await loadBalancerService.patchServer({
                    append: servers[0]
                });
                expect(loadBalancerService.getServers()[0]).toEqual(servers[0]);
            });
        });

        describe('given remove field in the request body for existing server', () => {
            it('should add new server to the servers property', async () => {
                let loadBalancerService = new LoadBalancerService([servers[0]]);

                await loadBalancerService.patchServer({
                    remove: servers[0]
                });
                expect(loadBalancerService.getServers()).toEqual([]);
            });
        });
    });

    describe('(-) updateServerStats', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.resetAllMocks();
        });

        describe('given request to update healthyCount stats', () => {
            it('should update the healthyCount of the server', async () => {
                let loadBalancerService = new LoadBalancerService([servers[0]]);

                await loadBalancerService.updateServerStats(servers[0], {
                    healthyCount: 1
                });
                expect(loadBalancerService.getServers()[0].healthyCount).toEqual(1);
            });
        });

        describe('given stats is AVAILABLE but the errorCount is > 5 after update stats', () => {
            it('should update to UNAVAILABLE and reset the stats', async () => {
                let loadBalancerService = new LoadBalancerService([servers[0]]);

                await loadBalancerService.updateServerStats(servers[0], {
                    errorCount: 6
                });
                expect(loadBalancerService.getServers()[0].status).toEqual(ServerStatus.UNAVAILABLE);
                expect(loadBalancerService.getServers()[0].healthyCount).toEqual(0);
                expect(loadBalancerService.getServers()[0].errorCount).toEqual(0);
                expect(loadBalancerService.getServers()[0].slowCount).toEqual(0);
            });
        });

        describe('given stats is UNAVAILABLE but the healthyCount is > 5 after update stats', () => {
            it('should update to AVAILABLE and reset the stats', async () => {
                let loadBalancerService = new LoadBalancerService([{
                    ...servers[0],
                    status: ServerStatus.UNAVAILABLE
                }]);

                await loadBalancerService.updateServerStats(servers[0], {
                    healthyCount: 6
                });
                expect(loadBalancerService.getServers()[0].status).toEqual(ServerStatus.AVAILABLE);
                expect(loadBalancerService.getServers()[0].healthyCount).toEqual(0);
                expect(loadBalancerService.getServers()[0].errorCount).toEqual(0);
                expect(loadBalancerService.getServers()[0].slowCount).toEqual(0);
            });
        });
    });
});