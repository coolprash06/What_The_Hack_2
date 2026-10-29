import { cookies } from "next/headers";
import { connection } from "next/server";
import { COOKIE, validSession } from "./core";

export async function authenticated() {
  await connection();
  return validSession((await cookies()).get(COOKIE)?.value);
}
