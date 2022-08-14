import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class User {
    @Field(() => Int)
    @PrimaryKey()
    id!: number;

    @Field()
    @Property({ type: "text", unique: true })
    username!: string;

    // @Field()
    // @Property({ type: "text", unique: true, nullable: true })
    // email!: string;

    @Property({ type: "text"})
    password!: string;
}