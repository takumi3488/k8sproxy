import type { FC } from "hono/jsx";
import { Layout } from "./Layout";

export const Login: FC<{ msg?: string }> = ({ msg }) => {
	return (
		<Layout>
			<div>
				<h3 class="">Login to k8sproxy</h3>
				{msg && <p class="notice">{msg}</p>}
				<form action="/k8sproxy/login" method="post">
					<div>
						<input
							type="password"
							placeholder="Enter password"
							name="password"
							class="text-input"
						/>
					</div>
					<button type="submit" class="btn">
						Submit
					</button>
				</form>
			</div>
		</Layout>
	);
};
