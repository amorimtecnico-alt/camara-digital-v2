import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  const administrationSector = await prisma.sector.upsert({
    where: { name: "Administracao" },
    update: {},
    create: {
      name: "Administracao",
      description: "Setor administrativo inicial do sistema",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@camara.local" },
    update: {
      name: "Administrador",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      active: true,
      sectorId: administrationSector.id,
    },
    create: {
      name: "Administrador",
      email: "admin@camara.local",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      active: true,
      sectorId: administrationSector.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
