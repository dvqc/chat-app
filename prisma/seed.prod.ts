import { prisma } from '#app/utils/db.server.ts'
import {
    cleanupDb,
    createPassword,
    img,
} from '#tests/db-utils.ts'

async function seed() {
    console.log('🌱 Seeding...')
    console.time(`🌱 Database has been seeded`)

    console.time('🧹 Cleaned up the database...')
    await cleanupDb(prisma)
    console.timeEnd('🧹 Cleaned up the database...')

    console.time('🔑 Created permissions...')
    const entities = ['user', 'channel', 'message']
    const actions = ['create', 'read', 'update', 'delete']
    const accesses = ['own', 'any', 'public'] as const
    for (const entity of entities) {
        for (const action of actions) {
            for (const access of accesses) {
                await prisma.permission.create({ data: { entity, action, access } })
            }
        }
    }
    console.timeEnd('🔑 Created permissions...')

    console.time('👑 Created roles...')
    await prisma.role.create({
        data: {
            name: 'admin',
            permissions: {
                connect: await prisma.permission.findMany({
                    select: { id: true },
                    where: { access: 'any' },
                }),
            },
        },
    })
    await prisma.role.create({
        data: {
            name: 'user',
            permissions: {
                connect: await prisma.permission.findMany({
                    select: { id: true },
                    where: {
                        OR: [
                            { access: 'own' },
                            { AND: [{ access: 'public' }, { action: 'read' }] },
                        ],
                    },
                }),
            },
        },
    })
    console.timeEnd('👑 Created roles...')

    console.time(`🐨 Created admin user "devx"`)

    const adminImage = await img({ filepath: './tests/fixtures/images/user/devx.jpg' })


    await prisma.user.create({
        select: { id: true },
        data: {
            email: 'bra-95@live.fr',
            username: 'devx',
            name: 'devx',
            image: { create: adminImage },
            password: { create: createPassword(process.env.ADMIN_PASSWORD) },
            roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
            channels: {
                create: [
                    {
                        id: 'd27a197e',
                        name: 'Welcome',
                    },
                ],
            },
        },
    })
    console.timeEnd(`🐨 Created admin user "devx"`)

    console.timeEnd(`🌱 Database has been seeded`)
}

seed()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
