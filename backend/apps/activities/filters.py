import django_filters

from .models import ActivityLog


class ActivityLogFilter(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="logged_at", lookup_expr="date__gte")
    end_date = django_filters.DateFilter(field_name="logged_at", lookup_expr="date__lte")
    category = django_filters.CharFilter(field_name="activity_type__category")

    class Meta:
        model = ActivityLog
        fields = ("activity_type", "category", "start_date", "end_date")
