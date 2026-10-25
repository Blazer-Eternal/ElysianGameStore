import { IUserPublic } from "./userInterface";

// Result of a successful login/register/refresh.
export interface IAuthResult {
    user: IUserPublic;
    accessToken: string;
}

export interface IJwtPayload {
    sub: string;
    role: string;
    email: string;
}
