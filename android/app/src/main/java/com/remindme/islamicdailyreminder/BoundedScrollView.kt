package com.remindme.islamicdailyreminder

import android.content.Context
import android.util.AttributeSet
import android.widget.ScrollView

class BoundedScrollView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : ScrollView(context, attrs, defStyleAttr) {

    var maxScrollHeightPx: Int = Int.MAX_VALUE
        set(value) {
            field = value
            requestLayout()
        }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val heightSize = MeasureSpec.getSize(heightMeasureSpec)
        val heightMode = MeasureSpec.getMode(heightMeasureSpec)

        val targetMax = if (maxScrollHeightPx in 1 until Int.MAX_VALUE) {
            if (heightMode != MeasureSpec.UNSPECIFIED) Math.min(heightSize, maxScrollHeightPx) else maxScrollHeightPx
        } else {
            heightSize
        }

        val constrainedHeightSpec = MeasureSpec.makeMeasureSpec(targetMax, MeasureSpec.AT_MOST)
        super.onMeasure(widthMeasureSpec, constrainedHeightSpec)
    }
}
