import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Task } from './Task';
import { WorkflowStatus } from '../workflows/WorkflowFactory'; // Assuming WorkflowStatus is defined here

@Entity({ name: 'workflows' })
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  workflowId!: string;

  @Column()
  clientId!: string;

  @Column({ default: WorkflowStatus.Initial })
  status!: WorkflowStatus;

  @Column({ type: 'text', nullable: true })
  finalResult?: string | null;

  @OneToMany(() => Task, (task) => task.workflow)
  tasks!: Task[];
}
