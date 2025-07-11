import { type DTOEntity } from './DTOEntity'

export interface DTOComposite extends DTOEntity {
  children: DTOEntity[]
}
