/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { AuthDto } from './dto/auth.dto';
import { verify } from 'argon2';
import { Response } from 'express';

@Injectable()
export class AuthService {
    private EXPIRES_IN_REFRESH_TOKEN = 1;
    private REFRESH_TOKEN_NAME = 'refreshToken';

    constructor(
        private jwt: JwtService,
        private userService: UserService
    ) { }

    async login(dto: AuthDto) {
        const { password, ...user } = await this.validateUser(dto);
        const tokens = this.issueTokens(user.id);

        return { user, ...tokens }
    }

    async register(dto: AuthDto) {
        const oldUser = await this.userService.getByEmail(dto.email);
        if (oldUser) throw new BadRequestException('User already exists');

        const { password, ...user } = await this.userService.create(dto);

        const tokens = this.issueTokens(user.id);

        return { user, ...tokens }
    }

    async getNewTokens(refreshToken: string) {
        const result = await this.jwt.verifyAsync(refreshToken);
        if (!result) throw new UnauthorizedException('Invalid token');

        const { ...user } = await this.userService.getByID(result.id);
        const { password, ...userWithoutPassword } = user;
        const tokens = this.issueTokens(user.id);

        return { userWithoutPassword, ...tokens }
    }

    private issueTokens(userId: string) {
        const data = { id: userId };

        const accessToken = this.jwt.sign(data, {
            expiresIn: '1h'
        })

        const refreshToken = this.jwt.sign(data, {
            expiresIn: '7d'
        })

        return { accessToken, refreshToken }
    }

    private async validateUser(dto: AuthDto) {
        const user = await this.userService.getByEmail(dto.email);

        if (!user) throw new NotFoundException('User not found');

        const isValidate = await verify(user.password, dto.password);

        if (!isValidate) throw new UnauthorizedException('Invalid password');

        return user;
    }

    addRefreshToken(res: Response, refreshToken: string) {
        const expiresIn = new Date()
        expiresIn.setDate(expiresIn.getDate() + this.EXPIRES_IN_REFRESH_TOKEN)

        res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            domain: 'localhost',
            expires: expiresIn,
            secure: true, //если это ПРОД
            sameSite: 'none' //lax есть это ПРОД
        })
    }

    removeRefreshToken(res: Response) {
        res.clearCookie(this.REFRESH_TOKEN_NAME, {
            httpOnly: true,
            domain: 'localhost',
            expires: new Date(0),
            secure: true,
            sameSite: 'none'
        })
    }
}
