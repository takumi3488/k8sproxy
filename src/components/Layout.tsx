import type { FC } from "hono/jsx";

export const Layout: FC = ({ children }) => {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>k8sproxy</title>
				<link rel="stylesheet" href="/styles.css" />
			</head>
			<body>
				<div class="container">{children}</div>
			</body>
		</html>
	);
};
