import { FC } from "hono/jsx";
import { Layout } from "./Layout";

export const Login: FC<{ msg?: string }> = ({ msg }) => {
	return (
		<Layout>
			<div>
				<h3 class="text-center mt-8">Login to k8sproxy</h3>
				{msg && <p class="notice">{msg}</p>}
				<form action="/login" method="post">
					<div>
						<input type="password" placeholder="Enter password" name="password" />
					</div>
					<button type="submit">Submit</button>
				</form>
			</div>
		</Layout>
	);
};
