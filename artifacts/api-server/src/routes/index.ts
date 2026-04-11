import { Router, type IRouter } from "express";
import healthRouter from "./health";
import moviesRouter from "./movies";
import usersRouter from "./users";
import analyticsRouter from "./analytics";
import broadcastRouter from "./broadcast";
import categoriesRouter from "./categories";
import botSettingsRouter from "./botSettings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moviesRouter);
router.use(usersRouter);
router.use(analyticsRouter);
router.use(broadcastRouter);
router.use(categoriesRouter);
router.use(botSettingsRouter);

export default router;
