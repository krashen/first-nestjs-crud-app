import {Test} from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto';

describe('App e2e', () => {

  let app: INestApplication;  
  let prisma: PrismaService;
  pactum.request.setBaseUrl('http://localhost:3333');
  const dto: AuthDto = {
    email: 'test@test.com',
    password: 'test12345678'
  };

  beforeAll(async  () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
      whitelist: true //strips out elements that are not defined in the dto, in req body
    }))
    await app.init();
    await app.listen(3333);

    prisma = app.get(PrismaService);

    await prisma.cleanDb();
  })
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('Auth', () => {
    describe('Signup', () => {
      const signUpPath = '/auth/signup';
      it('Should throw error if email empty', () => {
        return pactum.spec().post(signUpPath)
        .withBody({
          password: dto.password
        })
        .expectStatus(400);
      });

      it('Should throw error if password empty', () => {
        return pactum.spec().post(signUpPath)
        .withBody({
          email: dto.email
        })
        .expectStatus(400);
      });

      it('Should throw error if email incorrect', () => {
        return pactum.spec().post(signUpPath)
        .withBody({
          email: dto.password
        })
        .expectStatus(400);
      });

      it('Should throw error if no body is provided', () => {
        return pactum.spec().post(signUpPath)
        .expectStatus(400);
      });

      it('Should signup', () => {
        
        return pactum.spec().post(signUpPath)
        .withBody(dto)
        .expectStatus(201);
      })
    });
    describe('Signin', () => {
      const signInPath = '/auth/signin';
      it('Should throw error if email empty', () => {
        return pactum.spec().post(signInPath)
        .withBody({
          password: dto.password
        })
        .expectStatus(400);
      });

      it('Should throw error if password empty', () => {
        return pactum.spec().post(signInPath)
        .withBody({
          email: dto.email
        })
        .expectStatus(400);
      });

      it('Should throw error if email incorrect', () => {
        return pactum.spec().post(signInPath)
        .withBody({
          email: dto.password
        })
        .expectStatus(400);
      });

      it('Should throw error if no body is provided', () => {
        return pactum.spec().post(signInPath)
        .expectStatus(400);
      });
      it('Should sign in', () => {
        return pactum.spec().post(signInPath)
        .withBody(dto)
        .expectStatus(200)
        .stores('userAt', 'access_token')
      })
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      it('Should get current user', () => {
        return pactum
          .spec()
          .get('/users/me')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .expectStatus(200);
      })
    });
    describe('Edit user', () => {
      it('Should edit current user', () => {
        return pactum
          .spec()
          .patch('/users')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .withBody({
            firstName: 'Pabli',
            email: 'pabli@pabli.com',
          })         
          .expectStatus(200);
      })
    });
  })

  describe('Bookmarks', () => {
    describe('Get empty bookmarks', () => {
      it('Should get no bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .expectStatus(200);
      })
    });

    describe('Create bookmark', () => {
      it('Should create bookmark', () => {
        return pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .withBody({
            title:'Bookmark title',
            description: 'Bookmark description loca',
            link: 'Bookmarklink.com'
          })
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      })
    });

    describe('Get bookmarks', () => {
      it('Should get 1 bookmark', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .expectStatus(200)
          .expectJsonLength(1);
      })
    });

    describe('Get bookmark by id', () => {
      it('Should get bookmark by id', () => {
        return pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', `$S{bookmarkId}`)
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .expectStatus(200)
          .expectBodyContains(`$S{bookmarkId}`);
      })
    });

    describe('Edit bookmark', () => {
      it('Should edit bookmark by id', () => {
        return pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', `$S{bookmarkId}`)
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .withBody({
            description:'Bueno bueno bueno'
          })
          .expectStatus(200)
          .expectBodyContains('Bueno bueno bueno')
          .inspect();
      }) 
    });

    describe('Delete bookmark', () => {
      it('Should delete bookmark by id', () => {
        return pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', `$S{bookmarkId}`)
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .expectStatus(204);
      });

      it('Should get no bookmarks', () => {
        return pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: `Bearer $S{userAt}`
          })
          .expectStatus(200)
          .expectJsonLength(0);
      })
    });
    
  })
})