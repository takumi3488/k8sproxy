import type { FC } from "hono/jsx";
import type { UrlMapRepository } from "../db";
import { Layout } from "./Layout";

export const Index: FC<{ urlMapRepository: UrlMapRepository; domain: string }> =
	({ urlMapRepository, domain }) => {
		return (
			<Layout>
				<div>
					<h3>k8sproxy pages</h3>
					<div class="cards">
						{Object.keys(urlMapRepository.urlMaps).map((subdomain) => (
							<div class="card" key={subdomain}>
								<form
									action={`/k8sproxy/url_maps/${subdomain}`}
									method="post"
									id={`patch-${subdomain}`}
									class="form"
								>
									<span>
										<a href={`https://${subdomain}.${domain}`} class="card-title">{subdomain}</a>
									</span>
									<span>
										<input
											type="text"
											value={urlMapRepository.urlMaps[subdomain].proxyTo}
											name="proxyTo"
											class="text-input"
										/>
									</span>
									<span>
										<span class="horizontal">
											<input
												type="checkbox"
												checked={urlMapRepository.urlMaps[subdomain].isSecure}
												name="isSecure"
												id="isSecure"
											/>
											<label for="isSecure">Password</label>
										</span>
									</span>
								</form>
								<span class="pt-4">
									<span class="btns">
										<button
											type="submit"
											class="btn"
											form={`patch-${subdomain}`}
										>
											Update
										</button>
										<form
											action={`/k8sproxy/url_maps/${subdomain}`}
											method="post"
											class="form"
										>
											<input type="hidden" name="_method" value="DELETE" />
											<button type="submit" class="btn-red">
												Delete
											</button>
										</form>
									</span>
								</span>
							</div>
						))}
					</div>
				</div>
			</Layout>
		);
	};
