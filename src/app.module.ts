import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    //Aqui fica as Configurações para carregar as variaveis de ambientes para todo o projeto, o isGlobal em true, significa que vamos deixar global para todo o projeto que precisar das variaveis, caso ao contrario, teriamos que importar o ConfigModule em cada modulo que precisasse das variaveis de ambiente. 10/03/2026
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    //Vamos configuar o typeOrm para conectar com o banco de dados, todos os paramentros que iremos passar como senha do banco e etc, vira das variaveis de ambiente, porque se deixamos aqui escrito senha: 123456, alguem com acesso ao codigo fonte do projeto, poderia ver a senha do banco de dados, e isso não é seguro, por isso usamos as variaveis de ambiente. 10/03/2026
    TypeOrmModule.forRootAsync({
      //Colocamos async no final de root, porque vamos esperar o config carregar o configService para pegar as variaveis de ambiente, e ai sim, passar para o typeOrm as configurações do banco de dados. 10/03/2026
      imports: [ConfigModule], // Aqui pegamos o ConfigModule para usar o ConfigService, para pegar as variaveis de ambiente. 10/03/2026
      inject: [ConfigService], //vamos fazer a injecao de dependecencia para o factory poder usar o configService para pegar as variaveis de ambiente. 10/03/2026
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get('DB_HOST'), //Pega o host do bando dentro da .env
        port: parseInt(config.get('DB_PORT') ?? '1433'), //Pega a porta do bando dentro da .env ou se vir nullo usa a porta 1433
        username: config.get('DB_USER'), //Pega o usuario do bando dentro da .env
        password: config.get('DB_PASSWORD'), //Pega a senha do bando dentro da .env
        database: config.get('DB_NAME'), //Pega o nome do bando dentro da .env
        entities: [__dirname + '/**/*.entity{.ts,.js}'], //Aqui diz para o typeOrm onde estão as entidades do projeto, para ele poder criar as tabelas no banco de dados, e fazer o mapeamento objeto relacional. 10/03/2026
        synchronize: true, //Aqui diz para o typeOrm sincronizar as entidades com o banco de dados, ou seja, criar as tabelas no banco de dados, caso elas não existam, ou atualizar as tabelas caso elas já existam, mas tenham sido alteradas. 10/03/2026
        options: {
          encrypt: false, //Aqui diz para o typeOrm não criptografar a conexão com o banco de dados, isso é necessário para o SQL Server, caso contrário, ele não vai conseguir se conectar. 10/03/2026
          trustServerCertificate: true, //Aqui diz para o typeOrm confiar no certificado do servidor, isso é necessário para o SQL Server, caso contrário, ele não vai conseguir se conectar. 10/03/2026
        },
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
