import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  content!: string;

  @Column()
  createdAt!: string;

  @Column()
  ipAddress!: string;

  @Column()
  hidden!: boolean;

  @Column({ type: "simple-json", nullable: true })
  extraFields!: Record<string, string>;

  @Column({ type: "simple-json", nullable: true })
  reply!: { content: string; createdAt: string } | null;
}
