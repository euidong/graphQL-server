# graphQL-server

[![mysql](https://img.shields.io/badge/MySQL-5.7-blue)](https://dev.mysql.com/doc/refman/5.7/en/)
[![nexus](https://img.shields.io/badge/Nexus-latest-green)](https://nexusjs.org/)
[![prisma](https://img.shields.io/badge/Prisma2-latest-pink)](https://www.prisma.io/)


### Nexus Tutorial
- Nexus의 tutorial을 따라 작성한 graphQL 설정이다.
- 가장 기본적인 architecture라고 할 수 있다.
- 바꾼 거는 tdd code만 mysql로 바꾼 점이다.

# 내용 정리

# Nexus

- 더욱 원활한 graphql 사용자 경험을 제공하기 위한 툴이다.
- 각 데이터의 타입을 다양하게 관리할 수 있다.
- query 및 mutation을 깔끔하게 정리할 수 있다.
- 기본적으로 code-first이지만, schema-first 역시 호환할 수 있다.

- Nexus가 제시하는 4대 목표
    1. Type-Safety [by default](https://nexus.js.org/docs/type-generation)
    2. Readability
    3. Developer ergonomics
    4. Playing nicely with Prettier formatting

---

### Nexus CLI 실행

- 설치

    ```bash
    $ npm install -g nexus
    ```

- 핵심 command

    ```bash
    $ nexus dev # server를 watch mode로 실행시킵니다.
    $ nexus build # 프로젝트를 배포 상태로 만들어준다.
    ```

    해당 command가 실행될 때 반드시 알아야 할 점은 application 코드만 실행되는 것이 아니라, 정보가 수집되고, artifacts가 불러와진다.

    - 어떤 plugIn을 사용했고, 어떻게 사용 중인지
    - type safety하게 resolver를 적용하기 위해 typescript type을 생성한다.
    - SDL file을 생성한다. (api.graphql)

### 가장 기본이 되는 Type

- 기본적으로 nexus dev를 통해서 실행시키게 되면, nexus는 해당 프로젝트 안에 ts, js 파일을 탐색하며 수정된 데이터 부분을 수정한다.
- 그때, 가장 기본이 되는 type이 두가지 존재한다.
    - objectType ⇒ 데이터의 형태를 정의한다.
        - name: 해당 object의 이름을 지정한다.
        - definition: 해당 object의 element의 데이터 타입을 정의한다.

        ```tsx
        schema.objectType({
          name: 'Post',
          definition(t) {
            t.int('id')
            t.string('title')
            t.string('body')
            t.boolean('published')
          },
        });
        ```

    - extendType ⇒ 실제 데이터를 불러올 query 또는 mutation 등을 정의한다.
        - type: 해당 extend가 Query인지 mutation인지 등을 표현한다.
        - definition
            - t를 통해서 각 API의 기능을 명시한다.
            - field: 하나의 API를 의미한다.
                - type: 어떤 object를 대상으로 하는지를 명시한다.
                - args: 요청자로부터 전달받은 데이터를 의미한다.
                - nullable: return 값이 null일 수 있는지를 명시한다. 기본적으로는 true이다.
                - list: return 값이 list인지 단일 값인지를 명시한다.
                - resolve: 실제 데이터를 불러오는 동작을 수행하며, return한 데이터가 요청자에게 보여진다.
                    - root: request의 부가정보들을 포함한다.
                    - args: 요청자로 부터 받은 데이터를 의미한다.
                    - ctx: server context에 등록되어 있는 대상을 의미한다.

        ```tsx
        schema.extendType({
          type: 'Query',
          definition(t) {
            t.field('drafts', {
              type: 'Post',
              nullable: false,
              list: true,
              resolve(_root, _args, ctx) {
                return ctx.db.posts.filter(p => p.published === false)
              }
            })
            t.field('posts', {
              type: 'Post',
              list: true,
              resolve(_root, _args, ctx) {
                return ctx.db.posts.filter(p => p.published === true)
              }
            })
          }
        });

        schema.extendType({
          type: 'Mutation',
          definition(t) {
            t.field('createDraft', {
              type: 'Post',
              args: {
                title: schema.stringArg({ required: true }),
                body: schema.stringArg({ required: true })
              },
              nullable: false,
              resolve(_root, args, ctx) {
                const draft = {
                  id: ctx.db.posts.length + 1,
                  title: args.title,                         // 3
                  body: args.body,                           // 3
                  published: false,
                };
                ctx.db.posts.push(draft);
                return draft;
              }
            })
            t.field('publish', {
              type: 'Post',
              args: {
                draftId: schema.intArg({ required: true })
              },
              resolve(_root, args, ctx) {
                let draftToPublish = ctx.db.posts.find(p => p.id === args.draftId);
                if (!draftToPublish) 
                  throw new Error('Could not find draft with id' + args.draftId);
                draftToPublish.published = true;
                return draftToPublish;
              }
            })
          }
        })
        ```

### TDD

- Nexus에서는 TDD를 tutorial로 넣어놓을 만큼 자신들의 장점으로 내놓는다.
    - SetUp
        - 기본적으로 jest를 이용하여 구현한다.

            ```bash
            $ npm install --save-dev jest @types/jest ts-jest
            ```

        - package.json

            ```json
            {
            	"scripts": {
            	  "test": "jest"
              },
              "jest": {
                "preset": "ts-jest",
                "globals": {
                  "ts-jest": {
                    "diagnostics": { "warnOnly": true }
                  }
                },
                "testEnvironment": "node"
              }
            }
            ```

        - tests/__helpers.ts

            ```tsx
            import { createTestContext as originalCreateTestContext, TestContext } from 'nexus/testing'

            export function createTestContext() {
              let ctx = {} as TestContext
              beforeAll(async () => {
                Object.assign(ctx, await originalCreateTestContext())
                await ctx.app.start()
              })
              afterAll(async () => {
                await ctx.app.stop()
              })
              return ctx
            }
            ```

    - 테스트 수행
        - 게시글 작성 하고, 승인하기 까지의 절차를 테스팅하는 구문
        - 작성

            ```tsx
            // Post.test.ts
            import { createTestContext } from './__helpers'
            const ctx = createTestContext()
            it('ensures that a draft can be created and published', async () => {
              // Create a new draft
              const draftResult = await ctx.client.send(`
                mutation {
                  createDraft(title: "Nexus", body: "...") {
                    id
                    title
                    body
                    published
                  }
                }
              `)
              // Snapshot that draft and expect `published` to be false
              expect(draftResult).toMatchInlineSnapshot(`
                Object {
                  "createDraft": Object {
                    "body": "...",
                    "id": 1,
                    "published": false,
                    "title": "Nexus",
                  },
                }
              `)
              // Publish the previously created draft
              const publishResult = await ctx.client.send(`
                mutation publishDraft($draftId: Int!) {
                  publish(draftId: $draftId) {
                    id
                    title
                    body
                    published
                  }
                }
              `,
                { draftId: draftResult.createDraft.id }
              )
              // Snapshot the published draft and expect `published` to be true
              expect(publishResult).toMatchInlineSnapshot(`
                Object {
                  "publish": Object {
                    "body": "...",
                    "id": 1,
                    "published": true,
                    "title": "Nexus",
                  },
                }
              `)
            })
            ```

        - 실행

            ```bash
            $ npm run test

            # output
            PASS  tests/Post.test.ts
              ✓ ensures that a draft can be created and published (58 ms)

            Test Suites: 1 passed, 1 total
            Tests:       1 passed, 1 total
            Snapshots:   2 passed, 2 total
            Time:        4.094 s
            Ran all test suites.
            ```

### Nexus With Prisma

- Nexus Plugin
    - app개발을 용이하게 하기 위해서 nexus는 여러 개의 plug in을 제공하고 있다.
    - 3가지 종류의 plug in이 존재한다.
        1. worktime: 새로운 파일을 인식하거나 CLI command를 추가하는 역할
        2. runtime: preset과 middleware 등을 추가하는 역할
        3. testtime: test context를 추가하는 역할
    - 추가하는 방법

        ```bash
        $ npm install nexus-plugin-foo;
        ```

        ```tsx
        import foo from 'nexus-plugin-foo';
        import { use } from 'nexus';

        use(foo());
        ```

- Prisma 세팅하기
    - Prisma plugin 세팅하기
        1. plugin설치

            ```bash
            $ npm install nexus-plugin-prisma
            ```

        2. app.ts 파일 수정

            ```tsx
            import { use } from 'nexus';
            import { prisma } from 'nexus-plugin-prisma';

            use(prisma());
            ```

        3. prisma 최초 설정

            ```bash
            $ npx prisma init
            ```

        4. dataSource 지정

            ```tsx
            // prisma/schema.prisma

            datasource mysql {
            	provider = "mysql"
            	url = env("DATABASE_URL")
            }

            generator client {
              provider = "prisma-client-js"
            }
            ```

        5. env 설정
            - 여러가지 설정을 통해서 설정해주기 해당 tutorial은 prisma 파일에 .env를 저장한다.

                ```tsx
                # prisma/.env
                DATABASE_URL="mysql://user-name:password@localhost:port/db-name"
                ```

        6. db migration 생성

            ```bash
            $ npx prisma migrate save --experimental
            ```

        7. db migrtion 수행

            ```bash
            $ npx prisma migrate up --experimental
            ```

        8. prisma API 사용하기
            - prisma 에서 제공하는 API 명세에 따라서 데이터를 요청할 수 있다.
            - 해당 형태는 sequelize랑 유사하니 그대로 사용하면 된다.

            ```tsx
            schema.extendType({
              type: 'Mutation',
              definition(t) {
                t.field('createDraft', {
                  type: 'Post',
                  args: {
                    title: schema.stringArg({ required: true }),
                    body: schema.stringArg({ required: true })
                  },
                  nullable: false,
                  resolve(_root, args, ctx) {
                    const draft = {
                      title: args.title,                         // 3
                      body: args.body,                           // 3
                      published: false,
                    };
                    return ctx.db.post.create({ data: draft });
                  }
                })
                t.field('publish', {
                  type: 'Post',
                  args: {
                    draftId: schema.intArg({ required: true })
                  },
                  resolve(_root, args, ctx) {
                    return ctx.db.post.update({
                      where: { id: args.draftId },
                      data: {
                        published: true
                      }
                    });
                  }

                })
              }
            })
            ```

- Prisma 도입으로 영구 데이터까지 testing을 수행해야한다.
    - Setting
        - mysql 설치

            ```bash
            $ npm install mysql
            ```

        - 아직 nexus에서 modul을 제공하지 않기에 직접 제작해야한다.

            ```jsx
            // tests/nexus-test-environment.js

            const mysql = require('mysql')
            const NodeEnvironment = require('jest-environment-node')
            const util = require('util')
            const exec = util.promisify(require('child_process').exec)
            const prismaBinary = './node_modules/.bin/prisma'
            /**
             * Custom test environment for Nexus, Prisma and MySQL
             */
            class PrismaTestEnvironment extends NodeEnvironment {
              constructor(config) {
                super(config)
                // Generate the pg connection string for the test schema
                this.databaseUrl = `mysql://root:1234@localhost:3308/testing`
              }
              async setup() {
                // Set the required environment variable to contain the connection string
                process.env.DATABASE_URL = this.databaseUrl
                this.global.process.env.DATABASE_URL = this.databaseUrl
                // Run the migrations to ensure our schema has the required structure
                await exec(`${prismaBinary} migrate up --create-db --experimental`)
                return super.setup()
              }
              async teardown() {
                // Drop the schema after the tests have completed
                const client = new mysql.createConnection(`${this.databaseUrl}?debug=true`);
                await client.connect();
                await client.query(`DROP DATABASE IF EXISTS testing`);
                await client.end();
              }
            }
            module.exports = PrismaTestEnvironment
            ```

        - 라인 추가

            ```tsx
            // tests/__helpers.ts
            import { createTestContext as originalCreateTestContext, TestContext } from 'nexus/testing'

            export function createTestContext() {
              let ctx = {} as TestContext
              beforeAll(async () => {
                Object.assign(ctx, await originalCreateTestContext());
                await ctx.app.start();
              })
              afterAll(async () => {
                await ctx.app.db.client.$disconnect();
                await ctx.app.stop();
              })
              return ctx
            }
            ```

        - package.json 파일 변경

            ```json
            "jest": {
                "preset": "ts-jest",
                "globals": {
                  "ts-jest": {
                    "diagnostics": {
                      "warnOnly": true
                    }
                  }
                },
                "testEnvironment": "./tests/nexus-test-environment.js"
              }
            ```

    - test code 작성 그리고 마지막으로 최종 결과 확인 코드 추가

        ```tsx
        // tests/Post.test.ts

        import { createTestContext } from './__helpers'
        const ctx = createTestContext()
        it('ensures that a draft can be created and published', async () => {
          // Create a new draft
          const draftResult = await ctx.client.send(`
            mutation {
              createDraft(title: "Nexus", body: "...") {
                id
                title
                body
                published
              }
            }
          `)
          // Snapshot that draft and expect `published` to be false
          expect(draftResult).toMatchInlineSnapshot(`
            Object {
              "createDraft": Object {
                "body": "...",
                "id": 1,
                "published": false,
                "title": "Nexus",
              },
            }
          `)
          // Publish the previously created draft
          const publishResult = await ctx.client.send(`
            mutation publishDraft($draftId: Int!) {
              publish(draftId: $draftId) {
                id
                title
                body
                published
              }
            }
          `,
            { draftId: draftResult.createDraft.id }
          )
          // Snapshot the published draft and expect `published` to be true
          expect(publishResult).toMatchInlineSnapshot(`
            Object {
              "publish": Object {
                "body": "...",
                "id": 1,
                "published": true,
                "title": "Nexus",
              },
            }
          `)
          const persistedData = await ctx.app.db.client.post.findMany()
          expect(persistedData).toMatchInlineSnapshot(`
            Array [
              Object {
                "body": "...",
                "id": 1,
                "published": true,
                "title": "Nexus",
              },
            ]
          `)
        })
        ```
