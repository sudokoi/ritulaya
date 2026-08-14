declare module "*.module.css"

declare module "@/global.css"

declare module "*.md" {
  const content: string
  export default content
}
