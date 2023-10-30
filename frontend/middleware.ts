import { withAuth } from "next-auth/middleware";

export default withAuth;

// export default withAuth(
// 	{
// 		pages: {
// 			signIn: "/signin",
// 		}
// 	}
// );