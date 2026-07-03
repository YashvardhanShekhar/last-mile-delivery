import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, OrderType } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@lmd.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@lmd.com",
      password,
      role: Role.ADMIN,
      phone: "+919999999001",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@lmd.com" },
    update: {},
    create: {
      name: "Demo Customer",
      email: "customer@lmd.com",
      password,
      role: Role.CUSTOMER,
      phone: "+919999999002",
    },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: "agent@lmd.com" },
    update: {},
    create: {
      name: "Ravi Kumar",
      email: "agent@lmd.com",
      password,
      role: Role.AGENT,
      phone: "+919999999003",
      available: true,
      latitude: 28.6139,
      longitude: 77.209,
    },
  });

  await prisma.user.upsert({
    where: { email: "agent2@lmd.com" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "agent2@lmd.com",
      password,
      role: Role.AGENT,
      phone: "+919999999004",
      available: true,
      latitude: 28.5355,
      longitude: 77.391,
    },
  });

  const north = await prisma.zone.upsert({
    where: { name: "North Delhi" },
    update: {},
    create: { name: "North Delhi" },
  });

  const south = await prisma.zone.upsert({
    where: { name: "South Delhi" },
    update: {},
    create: { name: "South Delhi" },
  });

  const east = await prisma.zone.upsert({
    where: { name: "East Delhi" },
    update: {},
    create: { name: "East Delhi" },
  });

  const areas = [
    { name: "Civil Lines", pincode: "110054", zoneId: north.id },
    { name: "Model Town", pincode: "110009", zoneId: north.id },
    { name: "Hauz Khas", pincode: "110016", zoneId: south.id },
    { name: "Saket", pincode: "110017", zoneId: south.id },
    { name: "Laxmi Nagar", pincode: "110092", zoneId: east.id },
    { name: "Preet Vihar", pincode: "110091", zoneId: east.id },
  ];

  for (const area of areas) {
    await prisma.area.upsert({
      where: { pincode: area.pincode },
      update: { zoneId: area.zoneId, name: area.name },
      create: area,
    });
  }

  const zones = [north, south, east];
  for (const pickup of zones) {
    for (const drop of zones) {
      for (const orderType of [OrderType.B2C, OrderType.B2B]) {
        const isIntra = pickup.id === drop.id;
        const pricePerKg =
          orderType === OrderType.B2C
            ? isIntra
              ? 25
              : 40
            : isIntra
              ? 20
              : 35;
        const codCharge = orderType === OrderType.B2C ? 30 : 50;

        await prisma.rateCard.upsert({
          where: {
            pickupZoneId_dropZoneId_orderType: {
              pickupZoneId: pickup.id,
              dropZoneId: drop.id,
              orderType,
            },
          },
          update: { pricePerKg, codCharge },
          create: {
            pickupZoneId: pickup.id,
            dropZoneId: drop.id,
            orderType,
            pricePerKg,
            codCharge,
          },
        });
      }
    }
  }

  console.log("Seed complete:", {
    admin: admin.email,
    customer: customer.email,
    agent: agent1.email,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
