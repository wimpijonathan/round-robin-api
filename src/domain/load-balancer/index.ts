import { Server } from "../server";

export interface PatchServerRequest {
    append?: Server
    remove?: Server
}