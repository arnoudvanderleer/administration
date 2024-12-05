import { Request } from "express";

export const sanitize_date = (date : any) => 
    new Date(date ?? 0).getTime();

export const period_start = (req : Request) => 
    sanitize_date(req.session.financial_period?.start_date);

export const period_end = (req : Request) => 
    sanitize_date(req.session.financial_period?.end_date);

export const clip_period = (req : Request, date : any) =>
    new Date(Math.max(Math.min(new Date(date).getTime(), period_end(req)), period_start(req)));