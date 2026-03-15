/* eslint-disable prettier/prettier */
import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Plan } from './plan.enum';
import { Status } from './status.enum';

@Entity('tenants')
//colocamos dois check que tem enums para o banco checkar so o que definimos entrar no banco
@Check('check_values_tenant_plan',`"plan" IN  ('trial','free','pro','full')`)
@Check('check_values_tenant_status',`"status" IN ('trial','active','suspended')`)
export class Tenants {

    //Aqui vamos colocar chave primaria com auto incremento
    @PrimaryGeneratedColumn()
    id: number;

    //A coluna de nome 
    @Column()
    name: string;

    //esse campo adicionamos o unique para nao ter cpf repetido
    @Index({unique: true})
    @Column()
    cnpj: string;

    //Coluna para o telefone
    @Column()
    phone: string;

    /*
    O plano precisa ter trial, free , pro, full, precisei criar um arquivo de enum
    por fora para colocar os itens do plano , chamo ele dentro de column e deixo default
    o plano trial
    */
    @Column({
        type: 'varchar',
        default: Plan.TRIAL
    })
    plan: Plan;

    // aqui segue o mesmo principio da coluna de cima 
    @Column({
        type: 'varchar',
        default: Status.TRIAL
    })
    status: Status; 

    /*
        essa é a coluna mais complexa dessa entidade, deixamos so column e desativamos
        o not null porque o usuario pode começar com o plano pago, desse modo essa
        coluna nao seria necessaria, a logica dela estara dentro do services , vamos
        pegar a data atual da criaçao , verificar se o plano é trial, colocar a data 
        pra daqui 7 dias, e fazer a verificao se a data de trial ja acabou
    */
    @Column({
        nullable: true
    })
    trial_ends_at : Date

    // Aqui usamos o decorator de criar uma data
    @CreateDateColumn()
    created_at : Date
}
