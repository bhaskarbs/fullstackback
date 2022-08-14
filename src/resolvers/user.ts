import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import argon2 from "argon2";
import { COOKIE_NAME } from "../constants";
// import { Post } from "src/entities/Post";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {

  // @Mutation(() => Boolean)
  // async forgotPassword(
  //   @Arg('email') email: string,
  //   @Ctx() {em} : MyContext
  // ){
  //   const fork = em.fork();
  //  const user = await fork.findOne(User, { email });
  //   return true
  //   sendEmail("bhaskar@bahas.com", "hello")

  // }

  @Query(() => User, {nullable: true})
  async me (
    @Ctx() { em, req } : MyContext
  ) {
    if(!req.session.userId) {
        return null
    }
    const fork = em.fork();
    const user = await fork.findOne(User, { id: req.session.userId });
    return user
  }
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: "username",
            message: "length should be more",
          },
        ],
      };
    }
    const hassedPassword = await argon2.hash(options.password);
    const fork = em.fork();
    const user = fork.create(User, {
      username: options.username,
      password: hassedPassword,
    });
    try {
      await fork.persistAndFlush(user);
    } catch (err) {
      if (err.code === "23505" || err.detail.includes("already exists")) {
        return {
          errors: [
            {
              field: "username",
              message: "user present",
            },
          ],
        };
      }
    }

    req.session.userId = user.id
    
    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const fork = em.fork();
    const user = await fork.findOne(User, { username: options.username });
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "username does not resent",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, options.password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "incorrect password",
          },
        ],
      };
    }
    
    req.session.userId = user.id
    return { user };
  }

  @Mutation(() => Boolean) 
  logout(
    @Ctx() {req, res}: MyContext
  ){
    return new Promise(resolve => req.session.destroy(err => {
      res.clearCookie(COOKIE_NAME)
      if (err) {
        resolve(false)
        return
      }
      resolve(true)
    }))
  }
}
