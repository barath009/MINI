import cv2
import numpy as np

class LivenessEngine:
    @staticmethod
    def check_liveness(image_np: np.ndarray) -> tuple[bool, float]:
        """
        Anti-spoofing verification checking image texture variance, blur,
        and color distribution against photo printing and phone screen spoofing.
        """
        if image_np is None or image_np.size == 0:
            return False, 0.0

        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if len(image_np.shape) == 3 else image_np

        # 1. Texture frequency / Laplacian variance score
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # 2. Color spectrum distribution (Printed photo lacks natural skin tone dynamics)
        if len(image_np.shape) == 3:
            hsv = cv2.cvtColor(image_np, cv2.COLOR_BGR2HSV)
            h_std = np.std(hsv[:, :, 0])
            s_std = np.std(hsv[:, :, 1])
        else:
            h_std, s_std = 15.0, 30.0

        # Combine metrics into liveness score [0.0, 1.0]
        texture_score = min(laplacian_var / 500.0, 1.0)
        color_score = min((h_std + s_std) / 80.0, 1.0)

        liveness_score = 0.6 * texture_score + 0.4 * color_score
        liveness_passed = bool(liveness_score >= 0.40)

        return liveness_passed, round(float(liveness_score), 3)
