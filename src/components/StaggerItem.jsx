"use client";

import { motion } from "framer-motion";

const item = {
    hidden: { opacity: 0, y: 24 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.55,
            ease: "easeOut",
        },
    },
};

export default function StaggerItem({ children, className = "" }) {
    return (
        <motion.div variants={item} className={className}>
            {children}
        </motion.div>
    );
}