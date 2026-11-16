/**
 * One approved mixer registration. The guest list itself stays off git;
 * this is only the shape the listing builder needs.
 */
export interface VisionGuest {
  name: string
  email: string
  role: string
  stage: string
  thesis: string
  line?: string
  linkedin?: string
  website?: string
  github?: string
  scholar?: string
  looking?: string
}
