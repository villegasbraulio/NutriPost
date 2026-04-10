import django_filters

from .models import FoodLog


class FoodLogFilter(django_filters.FilterSet):
    date = django_filters.DateFilter(field_name="logged_at", lookup_expr="date")
    start_date = django_filters.DateFilter(field_name="logged_at", lookup_expr="date__gte")
    end_date = django_filters.DateFilter(field_name="logged_at", lookup_expr="date__lte")

    class Meta:
        model = FoodLog
        fields = ("meal_type", "date", "start_date", "end_date")
