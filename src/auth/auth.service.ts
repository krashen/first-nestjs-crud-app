import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {

    constructor (
        private prisma: PrismaService, 
        private jwt: JwtService, 
        private config: ConfigService
    ) {}

    async signup(dto: AuthDto){
        //generate password
        const hash = await argon.hash(dto.password);
        //save the new user in the db

        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    hash,
                }             
            });
            delete user.hash;
            return user;

        } catch (e) {
            if (e instanceof PrismaClientKnownRequestError){
                if (e.code === 'P2002') {
                    throw new ForbiddenException('Email already in use');
                }
            }
            
            throw e;
        }
       
    }

    async signin(dto: AuthDto) {
        const user = await this.prisma.user.findUnique({
            where: {
              email: dto.email,
            },
        });

        if (!user) throw new ForbiddenException('Email doesn\'t exist');

        const pwMatches = await argon.verify(user.hash, dto.password);

        if (!pwMatches) throw new ForbiddenException('Incorrect password');

        return this.signToken(user.id, user.email );

    }

        async signToken(userId: number,email: string): Promise<{access_token: string}> {
            const payload = {
                sub: userId, //sub is a convention for jwt, read the docs 
                email
            }

            const secret = this.config.get('JWT_SECRET');

            const token = await this.jwt.signAsync(payload, {
                expiresIn: '15m',
                secret 
            })

            return {
                access_token: token
            };

            
        }
    
}