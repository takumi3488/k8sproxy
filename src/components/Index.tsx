import { FC } from "hono/jsx";
import { Layout } from "./Layout";

export const Index: FC<{ paths: string[] }> = ({ paths }) => {
  return (
    <Layout>
      <div>
        <h3>k8sproxy pages</h3>
        <ul>
          {paths.map((path) => (<li><a href={`/${path}`}>{path}</a></li>))}
        </ul>
      </div>
    </Layout>
  )
}