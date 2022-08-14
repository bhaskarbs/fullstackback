import { MikroORM } from "@mikro-orm/core";
import { COOKIE_NAME, __prod__ } from "./constants";
import mikroconfig from "./mikro-orm.config";
// import { Post } from "./entities/Post";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import "reflect-metadata";
import { UserResolver } from "./resolvers/user";
import cors from "cors";
// import { User } from "./entities/User";

const session = require("express-session");
declare module "express-session" {
  export interface SessionData {
    userId: { [key: string]: any };
  }
}
let RedisStore = require("connect-redis")(session);
const { createClient } = require("redis");
let redisClient = createClient({ legacyMode: true });
redisClient.connect().catch(console.error);

const main = async () => {
  const orm = await MikroORM.init(mikroconfig);

  //   const generator = orm.getSchemaGenerator();
  //   await generator.updateSchema();
  
  // await orm.em.nativeDelete(User, {})
  await orm.getMigrator().up();

  const app = express();

  app.use(
    cors({
    origin: 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({ client: redisClient, disableTouch: true }),
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
      },
      secret: "keyboard cat",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ em: orm.em, req, res }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  // app.get('/', (_, res) => {
  //     res.send('hello')
  // })

  app.listen(4000, () => {
    console.log("server started!!");
  });

  //   const emFork = orm.em.fork(); // <-- create the fork
  //   const post = emFork.create(Post, { title: "vvvvqqq" });
  //   await emFork.persistAndFlush(post);

  //   const posts = await emFork.find(Post, {id: 1});
  //   console.log(posts);
};

main().catch((err) => {
  console.log(err);
});
