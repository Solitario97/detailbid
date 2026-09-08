import { NextResponse } from "next/server";
import { listCities, listActiveServices } from "@/modules/catalog/service";

export async function GET() {
  const [cities, services] = await Promise.all([listCities(), listActiveServices()]);
  return NextResponse.json({ cities, services });
}
